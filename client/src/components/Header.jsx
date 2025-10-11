import { setSocketAuthFromStorage } from "../lib/socket";
import { useAuth } from "../contexts/authContext";
import { Link } from "react-router-dom";

export default function Header() {
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    setSocketAuthFromStorage(); // refresh socket auth
  }

  return (
    <header className="flex w-full items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
      {/* Logo and Navigation */}
      <div className="flex items-center space-x-8">
        <Link
          to="/"
          className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
        >
          💡 Think Space
        </Link>

        {/* Navigation Links */}
        {user && (
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/boards"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/boards"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Archive
            </Link>
          </nav>
        )}
      </div>

      {/* User Actions */}
      {!user ? (
        <div className="flex items-center space-x-3">
          <Link
            to="/login"
            className="text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-lg transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            Get Started
          </Link>
        </div>
      ) : (
        <div className="flex items-center space-x-4">
          {/* User Info */}
          <div className="hidden sm:flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user.name
                  ? user.name.charAt(0).toUpperCase()
                  : user.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-sm">
              <div className="font-medium text-gray-900">
                {user.name || "User"}
              </div>
              <div className="text-gray-500">{user.email}</div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
