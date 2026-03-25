import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-center px-6">
      <div className="mb-6 text-8xl font-black text-gray-800">404</div>
      <h1 className="mb-3 text-2xl font-bold text-white">Page not found</h1>
      <p className="mb-8 text-gray-500 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
      >
        Back to Chat
      </Link>
    </div>
  );
}
