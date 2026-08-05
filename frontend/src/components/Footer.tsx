export default function Footer() {
  return (
    <footer className="border-t py-6 md:py-0 bg-muted/30">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 md:h-16">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} StreamVault HUB. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <a href="#" className="hover:underline underline-offset-4">Privacy</a>
          <a href="#" className="hover:underline underline-offset-4">Terms</a>
        </div>
      </div>
    </footer>
  );
}
