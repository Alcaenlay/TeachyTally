
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Github, Facebook, Instagram, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/icons";
import profilePic from './ID_Profile.png';
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
        <div className="absolute top-8 left-8">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Logo className="h-6 w-6" />
            <span className="font-semibold font-headline">TeachyTally</span>
            </Link>
        </div>
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <Avatar className="w-24 h-24 mx-auto mb-4 border-2 border-primary">
            <AvatarImage asChild>
                <Image src={profilePic} alt="Allen Paulo V. Caya" />
            </AvatarImage>
            <AvatarFallback className="text-4xl">AC</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl font-headline">Allen Paulo V. Caya</CardTitle>
          <CardDescription className="text-lg text-primary">Web & Mobile Application Developer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-muted-foreground">
            <p>
              Bachelor of Science in Information Technology
              <br />
              Major in Web and Mobile Application Development
            </p>
            <p className="font-semibold">Laguna State Polytechnic University (2022 - 2025)</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <MapPin className="w-5 h-5 mt-1 text-muted-foreground shrink-0"/>
                <div>
                    <h4 className="font-semibold">Location</h4>
                    <p className="text-muted-foreground">Lakyan Road Sulib, Pangil, Laguna</p>
                </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Phone className="w-5 h-5 mt-1 text-muted-foreground shrink-0"/>
                <div>
                    <h4 className="font-semibold">Phone</h4>
                    <a href="tel:+639773069531" className="text-muted-foreground hover:text-primary transition-colors">(+63) 977 306 9531</a>
                </div>
            </div>
             <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="w-5 h-5 mt-1 text-muted-foreground shrink-0"/>
                <div>
                    <h4 className="font-semibold">Email</h4>
                    <a href="mailto:allencaya132@gmail.com" className="text-muted-foreground hover:text-primary transition-colors">allencaya132@gmail.com</a>
                </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                 <div className="mt-1 text-muted-foreground shrink-0">
                    🎂
                </div>
                <div>
                    <h4 className="font-semibold">Birthday</h4>
                    <p className="text-muted-foreground">March 30, 2004 (21 years old)</p>
                </div>
            </div>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="icon" asChild>
                <a href="https://github.com/Alcaenlay" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                    <Github />
                </a>
            </Button>
            <Button variant="outline" size="icon" asChild>
                <a href="https://www.facebook.com/nyaaarkk" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <Facebook />
                </a>
            </Button>
            <Button variant="outline" size="icon" asChild>
                <a href="https://www.instagram.com/Alcaenlay" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <Instagram />
                </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
