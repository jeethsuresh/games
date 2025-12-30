import Link from "next/link";
import Sidebar from "@/components/Sidebar";

export default function NotFound() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="h-full p-8 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">404</h1>
            <p className="text-xl text-gray-600 mb-8">Game not found</p>
            <Link
              href="/"
              className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Go Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

