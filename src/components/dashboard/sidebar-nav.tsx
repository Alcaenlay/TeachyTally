
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  QrCode,
  BarChart3,
  CalendarClock,
  GraduationCap,
  ChevronDown,
  Circle,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import React from "react";
import { type VariantProps, cva } from "class-variance-authority";
import { TooltipContent } from "../ui/tooltip";


const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/students", label: "Students", icon: Users },
  { href: "/dashboard/schedules", label: "Schedules", icon: CalendarClock },
  { href: "/dashboard/scan", label: "Scan QR", icon: QrCode },
  { href: "/dashboard/grades", label: "Grades", icon: GraduationCap },
  { 
    label: "Reports", 
    icon: BarChart3,
    href: "/dashboard/reports",
    subItems: [
      { href: "/dashboard/reports/attendance", label: "Attendance" },
      { href: "/dashboard/reports/grades", label: "Grades" },
    ]
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  return (
    <SidebarMenu>
      {navItems.map((item, index) => (
        <SidebarMenuItem key={index}>
          {item.subItems ? (
            <Collapsible defaultOpen={pathname.startsWith(item.href)}>
              <CollapsibleTrigger asChild>
                 <SidebarMenuButton
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                  className="justify-between"
                  isSubmenu
                >
                  <div className="flex items-center gap-2">
                    <item.icon />
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:-rotate-180" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.subItems.map((subItem, subIndex) => (
                     <SidebarMenuSubItem key={subIndex}>
                        <Link href={subItem.href} onClick={handleLinkClick}>
                           <SidebarMenuSubButton isActive={pathname === subItem.href}>
                             <Circle className="mr-2" />
                            {subItem.label}
                           </SidebarMenuSubButton>
                        </Link>
                     </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <Link href={item.href} onClick={handleLinkClick}>
              <SidebarMenuButton
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

// Add isSubmenu prop to SidebarMenuButton component in ui/sidebar.tsx if needed
// For now, we will add a modified component here to avoid touching ui/sidebar.tsx

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const ModifiedSidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
    isSubmenu?: boolean
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      isSubmenu,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? "div" : "button"; // Use div for trigger if asChild
    const { isMobile, state } = useSidebar()

    const button = (
       <Comp
        ref={ref as any}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className, isSubmenu && "pr-2")}
        {...props}
      />
    )

    if (!tooltip) {
      return button
    }
    
    return button;
  }
)
ModifiedSidebarMenuButton.displayName = "ModifiedSidebarMenuButton"

// We are shadowing the original SidebarMenuButton to avoid changing the base UI component
const OriginalSidebarMenuButton = SidebarMenuButton;

(SidebarMenu as any).OriginalButton = OriginalSidebarMenuButton;
(SidebarMenu as any).Button = ModifiedSidebarMenuButton;

const SidebarMenuSubButton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    size?: "sm" | "md";
    isActive?: boolean;
  }
>(({ size = "md", isActive, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  );
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";


// The rest of your component uses SidebarMenuButton, it will now point to our modified one
// but let's be explicit for clarity
const RealSidebarMenuButton = (SidebarMenu as any).Button || OriginalSidebarMenuButton;
