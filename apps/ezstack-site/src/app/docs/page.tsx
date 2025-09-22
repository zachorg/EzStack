export default function DocsPage() {
  return (
    <div className="prose max-w-3xl">
      <h1>EzStack Docs</h1>
      <p>
        Welcome to EzStack. Below are essential steps to get started.
      </p>
      <h2>Authentication</h2>
      <ol>
        <li>Sign in with Google or email/password from the top-right.</li>
        <li>Go to API Keys to generate your key. Keys are shown once and not stored in plaintext.</li>
      </ol>
      <h2>API Key</h2>
      <p>
        The app uses Firebase for authentication. The Next.js API route at <code>/api/keys</code> forwards requests
        to the EzStack API and passes your Firebase ID token in the <code>Authorization</code> header.
        Plaintext keys are never stored client-side.
      </p>
      <h2>Next steps</h2>
      <ul>
        <li>Integrate OTP/OTE flows in your app’s backend using EzStack.</li>
        <li>Use Stripe or another provider for billing as needed.</li>
      </ul>
    </div>
  );
}


