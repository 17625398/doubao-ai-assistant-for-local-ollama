export interface Route {
  path: string;
  name: string;
  icon?: string;
  requiresAuth?: boolean;
  permissions?: string[];
}

class RouteManager {
  private routes: Route[] = [];
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.routes = [];
    this.initialized = true;
  }

  getRouteByPath(path: string): Route | undefined {
    return this.routes.find(r => r.path === path);
  }

  registerRoute(route: Route): void {
    this.routes.push(route);
  }

  getRoutes(): Route[] {
    return this.routes;
  }
}

export const routeManager = new RouteManager();
