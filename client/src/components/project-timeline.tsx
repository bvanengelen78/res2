import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface TimelineProject {
  id: number;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  completion: number;
  resourceCount: number;
  allocatedHours: number;
}

interface ProjectTimelineProps {
  projects: TimelineProject[];
}

export function ProjectTimeline({ projects }: ProjectTimelineProps) {
  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'active': 'default',
      'planned': 'secondary',
      'completed': 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startMonth = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startMonth} - ${endMonth}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Project Timeline
          </CardTitle>
          <Link href="/calendar">
            <Button variant="link" className="text-sm text-primary hover:text-blue-700 font-medium">
              View Full Gantt
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projects.slice(0, 4).map((project) => {
            const progressColor = getProgressColor(project.completion);
            
            return (
              <div key={project.id} className="space-y-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">{project.name}</span>
                    {getStatusBadge(project.status)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-medium ${getPriorityColor(project.priority)}`}>
                      {project.priority}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDateRange(project.startDate, project.endDate)}
                    </span>
                  </div>
                </div>
                <div className="relative h-3 bg-gray-200 rounded-full">
                  <div
                    className={`gantt-bar absolute h-full rounded-full ${progressColor}`}
                    style={{ width: `${project.completion}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{project.completion}% Complete</span>
                  <span>{project.resourceCount} resources • {project.allocatedHours}h allocated</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
