import { LayoutDashboard, Kanban, Users, CheckSquare, LogOut, DollarSign } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { getOverdueTasks, getTodayTasks } from '@/lib/storage';
import iconKhronos from '@/assets/icon-khronos.png';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Pipeline', url: '/pipeline', icon: Kanban },
  { title: 'Leads', url: '/leads', icon: Users },
  { title: 'Tarefas', url: '/tasks', icon: CheckSquare },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, logout } = useAuth();
  const pendingCount = getOverdueTasks().length + getTodayTasks().length;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-xs uppercase tracking-wider py-3">
            <img src={iconKhronos} alt="K" className="h-7 w-7 rounded-md" />
            {!collapsed && <span className="font-bold text-sm tracking-normal normal-case text-foreground">KHRÓNOS <span className="text-primary">CRM</span></span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && (
                        <span className="flex-1 flex items-center justify-between">
                          {item.title}
                          {item.title === 'Tarefas' && pendingCount > 0 && (
                            <Badge variant="destructive" className="ml-2 text-[10px] h-5 min-w-5 flex items-center justify-center">
                              {pendingCount}
                            </Badge>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && user && (
          <p className="text-xs text-sidebar-foreground mb-2 truncate">{user.name}</p>
        )}
        <SidebarMenuButton onClick={logout} className="flex items-center gap-3 text-sidebar-foreground hover:text-destructive cursor-pointer">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
