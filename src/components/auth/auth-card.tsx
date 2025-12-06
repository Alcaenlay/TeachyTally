import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type AuthCardProps = {
  title: string;
  description: string;
  footerText: string;
  footerLink: string;
  footerLinkText: string;
  children: React.ReactNode;
};

export function AuthCard({ title, description, footerText, footerLink, footerLinkText, children }: AuthCardProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          {footerText}{" "}
          <Link href={footerLink} className="font-semibold text-primary hover:underline">
            {footerLinkText}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
