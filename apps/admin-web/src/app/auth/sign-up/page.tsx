import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6">
        <div>
          <div className="h-12 w-12 rounded-xl bg-brand-950 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-lg font-black">SP</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">SealProof Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Request admin access</p>
        </div>
        <SignUp />
      </div>
    </div>
  );
}
