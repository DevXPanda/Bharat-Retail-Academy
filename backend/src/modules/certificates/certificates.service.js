import PDFDocument from 'pdfkit';
import Certificate from '../../models/Certificate.js';
import Enrollment from '../../models/Enrollment.js';
import { ApiError } from '../../utils/ApiError.js';
import { dateRangeFilter, escapeRegex, mergeFilters, paginate } from '../../utils/query.js';
import { randomId } from '../../utils/slug.js';
import { formatDate } from '../../utils/format.js';
import User from '../../models/User.js';
import Course from '../../models/Course.js';
import { notifyUsers } from '../../services/notify.js';
import { brandInfo } from '../../services/brand.js';

const POPULATE = [
  { path: 'student', select: 'name email avatar' },
  { path: 'course', select: 'title category' },
  { path: 'batch', select: 'name' },
];

const prefixFor = (category = 'GEN') => category.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'GEN';

async function generateCertificateId(course) {
  const year = new Date().getFullYear();
  for (let i = 0; i < 5; i += 1) {
    const id = `EC-${year}-${prefixFor(course.category)}-${randomId(6).toUpperCase()}`;
    if (!(await Certificate.exists({ certificateId: id }))) return id;
  }
  throw ApiError.conflict('Could not generate a certificate id');
}

export async function issueCertificate({ studentId, courseId, batchId, status = 'pending', issuedBy, completionDate }) {
  const existing = await Certificate.findOne({ student: studentId, course: courseId });
  if (existing) return existing;
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  return Certificate.create({
    certificateId: await generateCertificateId(course),
    student: studentId,
    course: courseId,
    batch: batchId,
    status,
    issuedBy,
    completionDate: completionDate || new Date(),
  });
}

export async function generateManually(actor, { studentId, courseId }) {
  const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
  if (!enrollment) throw ApiError.badRequest('Student is not enrolled in this course');
  const existing = await Certificate.findOne({ student: studentId, course: courseId });
  if (existing) throw ApiError.conflict('A certificate already exists for this student and course');
  const cert = await issueCertificate({ studentId, courseId, batchId: enrollment.batch, status: 'verified', issuedBy: actor._id });
  await notifyUsers([studentId], { title: 'Certificate ready', body: 'Your course completion certificate is available to download.', type: 'certificate', link: '/app/certificates', section: 'certificates', ref: cert.id });
  return cert.populate(POPULATE);
}

export async function listCertificates(query) {
  let studentFilter = null;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    const students = await User.distinct('_id', { role: 'student', $or: [{ name: regex }, { email: regex }] });
    const courses = await Course.distinct('_id', { title: regex });
    studentFilter = { $or: [{ student: { $in: students } }, { course: { $in: courses } }, { certificateId: regex }] };
  }
  const filter = mergeFilters(
    query.course ? { course: query.course } : null,
    query.batch ? { batch: query.batch } : null,
    query.status && query.status !== 'all' ? { status: query.status } : null,
    dateRangeFilter('completionDate', query.from, query.to),
    studentFilter,
  );
  return paginate(Certificate, filter, { page: query.page, limit: query.limit, sort: { completionDate: -1 }, populate: POPULATE });
}

export async function certificatesSummary() {
  const [total, verified, pending, revoked, expired, downloaded] = await Promise.all([
    Certificate.countDocuments(),
    Certificate.countDocuments({ status: 'verified' }),
    Certificate.countDocuments({ status: 'pending' }),
    Certificate.countDocuments({ status: 'revoked' }),
    Certificate.countDocuments({ status: 'expired' }),
    Certificate.countDocuments({ downloads: { $gt: 0 } }),
  ]);
  const recent = await Certificate.find({ status: { $in: ['verified'] } }).sort({ updatedAt: -1 }).limit(5).populate(POPULATE);
  return { total: { value: total }, verified: { value: verified }, downloaded: { value: downloaded }, pending: { value: pending }, revoked: { value: revoked }, expired: { value: expired }, recent };
}

export async function updateStatus(id, status) {
  const cert = await Certificate.findByIdAndUpdate(id, { status }, { new: true }).populate(POPULATE);
  if (!cert) throw ApiError.notFound('Certificate not found');
  if (status === 'verified') {
    await notifyUsers([cert.student._id], { title: 'Certificate verified', body: `Your certificate for ${cert.course.title} is ready.`, type: 'certificate', link: '/app/certificates', section: 'certificates', ref: cert.id });
  }
  return cert;
}

export async function bulkUpdate(ids, action) {
  const status = action === 'verify' ? 'verified' : 'revoked';
  const result = await Certificate.updateMany({ _id: { $in: ids } }, { status });
  return { affected: result.modifiedCount };
}

export async function myCertificates(studentId) {
  return Certificate.find({ student: studentId }).sort({ completionDate: -1 }).populate(POPULATE);
}

export async function verifyPublic(certificateId) {
  const cert = await Certificate.findOne({ certificateId }).populate(POPULATE);
  if (!cert) throw ApiError.notFound('No certificate found with this id');
  return {
    certificateId: cert.certificateId,
    status: cert.status,
    studentName: cert.student.name,
    course: cert.course.title,
    completionDate: cert.completionDate,
  };
}

export async function renderPdf(id, actor, res) {
  const cert = await Certificate.findById(id).populate(POPULATE);
  if (!cert) throw ApiError.notFound('Certificate not found');
  if (actor.role === 'student' && String(cert.student._id) !== String(actor._id)) throw ApiError.forbidden();
  if (actor.role === 'student' && cert.status !== 'verified') throw ApiError.forbidden('Certificate is not verified yet');
  if (actor.role === 'student') await Certificate.updateOne({ _id: id }, { $inc: { downloads: 1 } });

  const brand = await brandInfo();
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${cert.certificateId}.pdf"`);
  doc.pipe(res);

  const { width, height } = doc.page;
  doc.rect(0, 0, width, height).fill('#fbfcff');
  doc.lineWidth(6).rect(24, 24, width - 48, height - 48).stroke('#0b1b3f');
  doc.lineWidth(1.5).rect(38, 38, width - 76, height - 76).stroke('#f97316');

  // Faint logo behind the text, like a seal.
  if (brand.logo) {
    doc.save();
    doc.opacity(0.07);
    doc.image(brand.logo, width / 2 - 170, height / 2 - 150, { width: 340 });
    doc.restore();
    doc.image(brand.logo, width / 2 - 42, 52, { width: 84 });
  }

  doc.fillColor('#0b1b3f').font('Helvetica-Bold').fontSize(14).text(brand.name.toUpperCase(), 0, 144, { align: 'center', characterSpacing: 2 });
  doc.fillColor('#f97316').font('Helvetica').fontSize(8.5).text(brand.tagline.toUpperCase(), 0, 163, { align: 'center', characterSpacing: 1.5 });
  doc.fillColor('#0b1b3f').font('Helvetica-Bold').fontSize(34).text('Certificate of Completion', 0, 192, { align: 'center' });
  doc.fillColor('#51607a').font('Helvetica').fontSize(13).text('This is to certify that', 0, 246, { align: 'center' });
  doc.fillColor('#0b1b3f').font('Helvetica-Bold').fontSize(30).text(cert.student.name, 0, 268, { align: 'center' });
  doc.fillColor('#51607a').font('Helvetica').fontSize(13).text('has successfully completed the course', 0, 316, { align: 'center' });
  doc.fillColor('#f97316').font('Helvetica-Bold').fontSize(22).text(cert.course.title, 60, 340, { align: 'center', width: width - 120 });
  doc.fillColor('#51607a').font('Helvetica').fontSize(12).text(`Completed on ${formatDate(cert.completionDate)}`, 0, 398, { align: 'center' });
  doc.fontSize(11).text(`Certificate ID: ${cert.certificateId}`, 0, height - 112, { align: 'center' });
  doc.fontSize(9.5).text(`Verify this certificate on the ${brand.name} website using the certificate ID.`, 0, height - 94, { align: 'center' });
  doc.end();
}
