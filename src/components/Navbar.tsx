import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Menu, X, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const links = [
    { href: "/#sobre", label: "Sobre" },
    { href: "/#quartos", label: "Quartos" },
    { href: "/pesquisa", label: "Pesquisa" },
    { href: "/#contacto", label: "Contacto" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-sm border-b border-primary/20">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="font-display text-2xl font-bold text-primary-foreground tracking-wider">
          KIAME
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-primary-foreground/80 hover:text-accent transition-colors tracking-wide">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {isAdmin && (
                <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-accent hover:bg-primary/80" onClick={() => navigate("/admin")}>
                  <Shield className="w-4 h-4 mr-1" /> Admin
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-accent hover:bg-primary/80" onClick={() => navigate("/dashboard")}>
                <LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-accent hover:bg-primary/80" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-1" /> Sair
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-accent hover:bg-primary/80" onClick={() => navigate("/login")}>
                Entrar
              </Button>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate("/registo")}>
                Registar
              </Button>
            </>
          )}
        </div>

        {/* Mobile: mode toggle + menu */}
        <div className="md:hidden flex items-center gap-2">
          <button className="text-primary-foreground" onClick={() => setOpen(!open)}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-primary border-t border-primary/20 px-4 pb-4 space-y-2">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-2 text-sm text-primary-foreground/80 hover:text-accent transition-colors uppercase tracking-wide">
              {l.label}
            </a>
          ))}
          <div className="pt-2 border-t border-primary/20 space-y-2">
            {user ? (
              <>
                {isAdmin && (
                  <Button variant="ghost" size="sm" className="w-full justify-start text-primary-foreground/80" onClick={() => { navigate("/admin"); setOpen(false); }}>
                    <Shield className="w-4 h-4 mr-2" /> Admin
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="w-full justify-start text-primary-foreground/80" onClick={() => { navigate("/dashboard"); setOpen(false); }}>
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-primary-foreground/80" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="w-full justify-start text-primary-foreground/80" onClick={() => { navigate("/login"); setOpen(false); }}>
                  Entrar
                </Button>
                <Button size="sm" className="w-full bg-accent text-accent-foreground" onClick={() => { navigate("/registo"); setOpen(false); }}>
                  Registar
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
