
import Link from 'next/link';
import { Logo } from '@/components/icons';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="absolute top-8 left-8">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <Logo className="h-6 w-6" />
          <span className="font-semibold font-headline">TeachyTally</span>
        </Link>
      </div>
      {children}
    </div>
  );
}
