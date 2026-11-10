export default function PageFrame({ title, description, actions, className = '', children }) {
  return (
    <div className={`academy-page ${className}`}>
      {title && <header className="academy-page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions}</header>}
      {children}
    </div>
  );
}
