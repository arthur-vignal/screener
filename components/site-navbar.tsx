"use client"

import { useState } from "react"
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar"
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button"

const navItems = [
  { name: "Recursos", link: "#recursos" },
  { name: "Mercados", link: "#mercados" },
  { name: "Planos", link: "#planos" },
]

export function SiteNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <Navbar>
      {/* Desktop */}
      <NavBody>
        <NavbarLogo />
        <NavItems items={navItems} />
        <div className="flex items-center gap-2">
          <LiquidGlassButton
            variant="ghost"
            className="px-4 py-2 text-[13px]"
          >
            Entrar
          </LiquidGlassButton>
          <LiquidGlassButton
            variant="default"
            className="px-4 py-2 text-[13px]"
          >
            Começar agora
          </LiquidGlassButton>
        </div>
      </NavBody>

      {/* Mobile */}
      <MobileNav>
        <MobileNavHeader>
          <NavbarLogo />
          <MobileNavToggle isOpen={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        </MobileNavHeader>

        <MobileNavMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)}>
          {navItems.map((item, idx) => (
            <a
              key={`mobile-link-${idx}`}
              href={item.link}
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="block">{item.name}</span>
            </a>
          ))}
          <div className="flex w-full flex-col gap-3 pt-2">
            <LiquidGlassButton
              variant="ghost"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full px-4 py-2.5 text-sm"
            >
              Entrar
            </LiquidGlassButton>
            <LiquidGlassButton
              variant="default"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full px-4 py-2.5 text-sm"
            >
              Começar agora
            </LiquidGlassButton>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  )
}
