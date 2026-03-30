export default function Footer() {
  return (
    <footer className="bg-transparent">
      <div className="app-container py-8">
        <div className="frame p-4">
          <p className="text-center text-sm font-semibold text-slate-700">
            Powered by{" "}
            <a
              href="https://yeahzz.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold text-slate-900 hover:underline"
            >
              yeahzz.in
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}