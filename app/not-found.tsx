import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-gray-800 mb-4">404 - Page Not Found</h2>
        <p className="text-gray-600 mb-6">
          The page you are looking for could not be found.
        </p>
        <Link
          href="/"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-block"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}