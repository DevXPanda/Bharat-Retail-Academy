import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND, BRAND_LOGO, useAuth, useClient, useInvalidate, useToast } from '@ecomedu/ui';

const SDK = 'https://checkout.razorpay.com/v1/checkout.js';

const loadSdk = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = SDK;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load the payment gateway. Check your connection.'));
    document.body.appendChild(script);
    return undefined;
  });

export function useCheckout() {
  const client = useClient();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const refresh = useInvalidate();
  const [loading, setLoading] = useState(false);

  const buy = useCallback(
    async (course) => {
      if (!user) {
        navigate(`/login?next=${encodeURIComponent(`/courses/${course.slug}`)}`);
        return;
      }
      setLoading(true);
      try {
        const { data: order } = await client.post('/payments/orders', { courseId: course.id });
        if (order.free) {
          toast.success('You are enrolled! Happy learning.');
          await refresh('/learning', '/public/courses');
          navigate('/app/courses');
          return;
        }
        await loadSdk();

        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: BRAND.name,
          image: new URL(BRAND_LOGO, window.location.origin).href,
          description: order.course.title,
          prefill: order.prefill,
          theme: { color: '#1a5ce6' },
          handler: async (response) => {
            try {
              await client.post('/payments/verify', response);
              toast.success('Payment successful. Your course is unlocked!');
              await refresh('/learning', '/public/courses', '/payments');
              navigate('/app/courses');
            } catch (err) {
              toast.error(err.message, 'Payment verification failed');
            }
          },
          modal: { ondismiss: () => setLoading(false) },
        });
        rzp.on('payment.failed', (res) => {
          client.post('/payments/failed', { orderId: order.orderId, reason: res.error?.description }).catch(() => {});
          toast.error(res.error?.description || 'Payment failed. Please try again.');
        });
        rzp.open();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [client, user, toast, navigate, refresh],
  );

  return { buy, loading };
}
