import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const paths = pathname.split('/').filter(Boolean);
  
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' }
  ];

  // Build breadcrumbs based on current path
  let currentPath = '';
  
  for (const path of paths) {
    currentPath += `/${path}`;
    
    switch (path) {
      case 'tournaments':
        breadcrumbs.push({ label: 'Tournaments', href: currentPath });
        break;
      default:
        // For dynamic segments, just show the path
        breadcrumbs.push({ label: path, href: currentPath });
        break;
    }
  }
  
  return breadcrumbs;
}

export function Navigation() {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  
  // Don't show breadcrumbs on home page
  if (location.pathname === '/') {
    return null;
  }

  return (
    <nav className="border-b border-border bg-background" aria-label="Breadcrumb navigation">
      <div className="container mx-auto px-4 py-3">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((breadcrumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              
              return (
                <div key={breadcrumb.href || breadcrumb.label} className="flex items-center">
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="font-medium">
                        {breadcrumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link 
                          to={breadcrumb.href!} 
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {breadcrumb.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator className="mx-2" />}
                </div>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </nav>
  );
}