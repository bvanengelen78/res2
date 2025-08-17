import { Plus, UserPlus, BarChart, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  onCreateProject: () => void;
  onAddResource: () => void;
  onGenerateReport: () => void;
}

export function QuickActions({ onCreateProject, onAddResource, onGenerateReport }: QuickActionsProps) {
  const actions = [
    {
      title: "Create New Project",
      description: "Start a new project and allocate resources efficiently",
      icon: Plus,
      action: onCreateProject,
    },
    {
      title: "Add Resource",
      description: "Add new team members or update existing profiles",
      icon: UserPlus,
      action: onAddResource,
    },
    {
      title: "Generate Report",
      description: "Create detailed utilization and capacity reports",
      icon: BarChart,
      action: onGenerateReport,
    },
  ];

  return (
    <Card className={cn("bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 w-full mb-8")}>
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Quick Actions
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Streamline your workflow with these common tasks
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <div
                key={action.title}
                onClick={action.action}
                className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-200 hover:shadow-sm cursor-pointer group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    action.action();
                  }
                }}
                aria-label={`${action.title}: ${action.description}`}
              >
                {/* Icon and Title */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-900">
                    {action.title}
                  </h3>
                </div>

                {/* Description */}
                <div className="mb-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {action.description}
                  </p>
                </div>

                {/* Action indicator */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
                    Click to {action.title.toLowerCase()}
                  </span>
                  <div className="w-2 h-2 rounded-full bg-blue-200 group-hover:bg-blue-300 transition-colors"></div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
