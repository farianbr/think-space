import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import LoginForm from "../features/auth/LoginForm";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDemo, setIsDemo] = useState(false);

  const from = location.state?.from?.pathname || "/boards";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="text-3xl font-bold text-gray-900 inline-block hover:text-blue-600 transition-colors"
          >
            💡 Think Space
          </Link>
          <p className="text-gray-600 mt-2">
            Welcome back! Sign in to your account
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h1>
            <p className="text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create one here
              </Link>
            </p>
            <button
              onClick={() => setIsDemo(!isDemo)}
              className="text-gray-600 text-sm mt-1 block hover:text-gray-800 underline "
            >
              use a demo account
            </button>
          </div>

          <LoginForm
            onSuccess={() => {
              navigate(from, { replace: true });
            }}
            isDemo={isDemo}
          />

          {/* Additional Options */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <Link
                to="/"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Secure sign-in powered by Think Space</p>
        </div>
      </div>
    </div>
  );
}
