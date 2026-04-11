"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: React.ReactNode;
  };
  children?: React.ReactNode;
}

export function PageHeader({ title, description, backHref, action, children }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link href={backHref}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {action && (
          action.href ? (
            <Link href={action.href}>
              <Button className="gap-2">
                {action.icon}
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button onClick={action.onClick} className="gap-2">
              {action.icon}
              {action.label}
            </Button>
          )
        )}
      </div>
      {children}
    </div>
  );
}
