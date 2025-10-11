import React from "react";
import { useNavigate, Link } from "react-router-dom";
import RegisterForm from "../features/auth/RegisterForm";

export default function RegisterPage() {
  const navigate = useNavigate();

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
            Create your account and start collaborating
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Create Account
            </h1>
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign in here
              </Link>
            </p>
          </div>

          <RegisterForm
            onSuccess={() => {
              navigate("/boards", { replace: true });
            }}
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
          <p>Join thousands of teams already using Think Space</p>
        </div>
      </div>
    </div>
  );
}
