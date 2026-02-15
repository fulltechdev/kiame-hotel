import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-display text-2xl font-bold tracking-wider mb-4">KIAME</h3>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Um refúgio de elegância e conforto. Descubra a experiência Kiame.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-accent">Navegação</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><a href="/#sobre" className="hover:text-accent transition-colors">Sobre Nós</a></li>
              <li><a href="/#quartos" className="hover:text-accent transition-colors">Quartos</a></li>
              <li><Link to="/pesquisa" className="hover:text-accent transition-colors">Pesquisa</Link></li>
              <li><a href="/#contacto" className="hover:text-accent transition-colors">Contacto</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-accent">Contacto</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>info@kiame.com</li>
              <li>+351 912 345 678</li>
              <li>Rua da Elegância, 42</li>
              <li>Lisboa, Portugal</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-primary-foreground/10 text-center text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} Kiame Hotel. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
