'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { GeistMono } from 'geist/font/mono';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export interface NavItem {
  title: string;
  url?: string;
  icon: LucideIcon;
  badge?: number;
  /** Things added since the visitor last looked (the feed's unseen headlines). */
  fresh?: number;
  items?: {
    title: string;
    url: string;
  }[];
}

const isExternal = (url: string) => /^https?:\/\//.test(url);

/** Anchor that uses client navigation for internal routes and a new tab for external ones. */
const NavLink = ({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) =>
  isExternal(href) ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );

/** "Something new since your last visit": a pinging dot and how many, at the end of a row. Overflow
 * stays visible: the sidebar truncates a row's last span, which would clip the dot's glow. */
export const FreshMarker = ({ count }: { count: number }) => (
  <span
    aria-label={`${count} ${count === 1 ? 'novedad' : 'novedades'} sin ver`}
    className="ml-auto flex shrink-0 items-center gap-1.5 overflow-visible! pl-1 font-mono text-[9px] tracking-widest text-pcnGreen"
  >
    <span aria-hidden className="relative flex size-1.5">
      <span className="absolute inset-0 animate-ping rounded-full bg-pcnGreen" />
      <span className="relative size-1.5 rounded-full bg-pcnGreen shadow-[0_0_8px_rgba(4,244,190,1)]" />
    </span>
    {count > 9 ? '9+' : `+${count}`} {count === 1 ? 'nuevo' : 'nuevos'}
  </span>
);

/**
 * Unread count as a terminal readout: a chamfered, glowing chip with a zero-padded number, a
 * blinking cursor and a light sweep running across it now and then.
 */
export const CountBadge = ({ count }: { count: number }) => (
  <span className="ml-auto shrink-0 overflow-visible! drop-shadow-[0_0_6px_rgba(4,244,190,0.55)]">
    <span className="relative isolate flex h-5 items-center gap-0.5 overflow-hidden bg-pcnGreen pr-1.5 pl-2 font-mono text-[10px] leading-none font-bold text-black tabular-nums [clip-path:polygon(5px_0,100%_0,100%_calc(100%-5px),calc(100%-5px)_100%,0_100%,0_5px)] before:absolute before:inset-y-0 before:left-0 before:-z-10 before:w-1/3 before:animate-cta-shine before:bg-linear-to-r before:from-transparent before:via-white/70 before:to-transparent motion-reduce:before:hidden">
      {count > 99 ? '99+' : String(count).padStart(2, '0')}
      <span
        aria-hidden
        className="h-2.5 w-[3px] animate-blink bg-black/70 motion-reduce:animate-none"
      />
    </span>
  </span>
);

export const SidebarSectionLabel = ({ children }: { children: React.ReactNode }) => (
  <SidebarGroupLabel
    className={cn(
      GeistMono.className,
      'h-7 px-2.5 text-[10px] font-medium tracking-[0.18em] text-pcnGreen-500 uppercase before:mr-1.5 before:text-pcnGreen-300 before:content-["##"]',
    )}
  >
    {children}
  </SidebarGroupLabel>
);

// `nav-hack` (globals.css) is the hover and the active look; what it paints replaces the accent fill.
const menuButtonClassName =
  'nav-hack relative h-9 rounded-sm px-2.5 text-[13px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-transparent hover:font-mono [&>svg]:size-4 [&>svg]:text-sidebar-foreground/45 [&>svg]:transition-colors [&>svg]:hover:text-sidebar-foreground data-[active=true]:bg-transparent data-[active=true]:font-mono data-[active=true]:font-semibold data-[active=true]:text-pcnGreen data-[active=true]:hover:bg-transparent data-[active=true]:hover:text-pcnGreen data-[active=true]:[&>svg]:text-pcnGreen data-[state=open]:hover:bg-sidebar-accent';

export function NavMain({ items, label }: { items: NavItem[]; label?: string }) {
  const pathname = usePathname();

  return (
    <SidebarGroup className="py-1.5">
      {label && <SidebarSectionLabel>{label}</SidebarSectionLabel>}
      <SidebarMenu className="gap-0.5">
        {items.map((item) => {
          const isActive = item.url
            ? pathname === item.url || (item.url !== '/' && pathname.startsWith(item.url))
            : false;
          const hasActiveSubItem = item.items?.some((subItem) => pathname === subItem.url);
          const isToggleOnly = !item.url && !!item.items?.length;

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isActive || hasActiveSubItem}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                {(isActive || hasActiveSubItem) && (
                  <span
                    aria-hidden
                    className="absolute top-2.5 -left-2 h-4 w-[3px] bg-pcnGreen shadow-[0_0_10px_rgba(4,244,190,0.8)]"
                  />
                )}

                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActive}
                  className={cn(menuButtonClassName, hasActiveSubItem && 'text-sidebar-foreground')}
                >
                  {isToggleOnly ? (
                    <CollapsibleTrigger>
                      <item.icon className="shrink-0" strokeWidth={1.75} />
                      <span>{item.title}</span>
                    </CollapsibleTrigger>
                  ) : (
                    <NavLink href={item.url!} className="flex items-center gap-2.5">
                      <item.icon strokeWidth={1.75} />
                      <span>{item.title}</span>
                      {!!item.fresh && !isActive && <FreshMarker count={item.fresh} />}
                      {isActive && !(item.badge && item.badge > 0) && (
                        // "You are here": a pulsing marker at the end of the row.
                        <span
                          aria-hidden
                          className="ml-auto flex items-center gap-1 font-mono text-[9px] tracking-widest text-pcnGreen/80"
                        >
                          <span className="size-1.5 animate-pulse rounded-full bg-pcnGreen shadow-[0_0_8px_rgba(4,244,190,1)]" />
                          aquí
                        </span>
                      )}
                      {item.badge !== undefined && item.badge > 0 && (
                        <CountBadge count={item.badge} />
                      )}
                    </NavLink>
                  )}
                </SidebarMenuButton>

                {item.items?.length ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="top-2 rounded-md text-sidebar-foreground/45 hover:bg-transparent hover:text-sidebar-foreground data-[state=open]:rotate-90 [&>svg]:transition-transform">
                        <ChevronRight />
                        <span className="sr-only">Toggle</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="mx-[1.15rem] my-1 gap-0.5 border-pcnGreen-200 px-2">
                        {item.items?.map((subItem) => {
                          const isSubItemActive = pathname === subItem.url;
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isSubItemActive}
                                className={cn(
                                  'nav-hack relative h-8 rounded-sm px-2 text-[13px] text-sidebar-foreground/60 hover:bg-transparent hover:font-mono',
                                  isSubItemActive &&
                                    'bg-transparent font-medium text-pcnGreen hover:bg-transparent hover:text-pcnGreen',
                                )}
                              >
                                <NavLink href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
