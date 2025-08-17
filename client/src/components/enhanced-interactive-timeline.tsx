import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Calendar, 
  Filter, 
  Eye, 
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Target,
  TrendingUp,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { format, parseISO, differenceInDays, isAfter, isBefore } from "date-fns";

interface TimelineProject {
  id: number;
  name: string;
  description: string;
  status: string;
  priority: 'high' | 'medium' | 'low';
  startDate: string;
  endDate: string;
  completion: number;
  resourceCount: number;
  allocatedHours: number;
  department?: string;
  milestones?: Array<{
    id: number;
    name: string;
    date: string;
    completed: boolean;
    critical: boolean;
  }>;
  risks?: Array<{
    id: number;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  budget?: {
    total: number;
    spent: number;
  };
}

interface EnhancedInteractiveTimelineProps {
  projects: TimelineProject[];
  className?: string;
}

export function EnhancedInteractiveTimeline({ projects, className }: EnhancedInteractiveTimelineProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  // Filter projects based on selected filters
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      if (filterStatus !== 'all' && project.status !== filterStatus) return false;
      if (filterPriority !== 'all' && project.priority !== filterPriority) return false;
      if (filterDepartment !== 'all' && project.department !== filterDepartment) return false;
      return true;
    });
  }, [projects, filterStatus, filterPriority, filterDepartment]);

  // Get unique departments for filter
  const departments = useMemo(() => {
    const depts = Array.from(new Set(projects.map(p => p.department).filter(Boolean)));
    return depts.sort();
  }, [projects]);

  // Calculate project health score
  const getProjectHealth = (project: TimelineProject) => {
    const endDate = parseISO(project.endDate);
    const startDate = parseISO(project.startDate);
    const totalDays = differenceInDays(endDate, startDate);
    const daysRemaining = differenceInDays(endDate, new Date());
    const daysElapsed = totalDays - daysRemaining;
    
    const expectedProgress = totalDays > 0 ? Math.max(0, Math.min(100, (daysElapsed / totalDays) * 100)) : 0;
    const progressGap = expectedProgress - project.completion;
    
    let healthScore = 100;
    let status: 'excellent' | 'good' | 'at-risk' | 'critical' = 'excellent';
    
    if (progressGap > 30) {
      healthScore = 25;
      status = 'critical';
    } else if (progressGap > 15) {
      healthScore = 50;
      status = 'at-risk';
    } else if (progressGap > 5) {
      healthScore = 75;
      status = 'good';
    }
    
    // Factor in risks
    const highRisks = project.risks?.filter(r => r.severity === 'high').length || 0;
    healthScore -= highRisks * 10;
    
    return { healthScore: Math.max(0, healthScore), status };
  };

  const getProgressColor = (progress: number, health: string) => {
    if (health === 'critical') return 'bg-red-500';
    if (health === 'at-risk') return 'bg-yellow-500';
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'active': 'default',
      'planned': 'secondary',
      'completed': 'outline',
      'on-hold': 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'excellent': return CheckCircle;
      case 'good': return TrendingUp;
      case 'at-risk': return Clock;
      case 'critical': return AlertTriangle;
      default: return Target;
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const startMonth = format(start, 'MMM dd');
    const endMonth = format(end, 'MMM dd');
    return `${startMonth} - ${endMonth}`;
  };

  const getDaysRemaining = (endDate: string) => {
    const days = differenceInDays(parseISO(endDate), new Date());
    return Math.max(0, days);
  };

  return (
    <Card className={cn("rounded-2xl shadow-sm hover:shadow-md transition-all duration-200", className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <div className="p-2 rounded-lg bg-blue-100">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              Interactive Project Timeline
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Clickable project bars with milestone breakdowns and health indicators
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            {departments.length > 0 && (
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Link href="/calendar">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Full Gantt
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {filteredProjects.slice(0, 6).map((project) => {
            const health = getProjectHealth(project);
            const HealthIcon = getHealthIcon(health.status);
            const progressColor = getProgressColor(project.completion, health.status);
            const daysRemaining = getDaysRemaining(project.endDate);
            const isSelected = selectedProject === project.id;
            
            return (
              <div key={project.id} className={cn(
                "space-y-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer",
                isSelected ? "bg-blue-50 border-blue-200 shadow-md" : "bg-gray-50 hover:bg-gray-100 border-gray-200"
              )}
              onClick={() => setSelectedProject(isSelected ? null : project.id)}
              >
                {/* Project Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HealthIcon className={cn("h-5 w-5",
                      health.status === 'excellent' || health.status === 'good' ? 'text-green-600' :
                      health.status === 'at-risk' ? 'text-yellow-600' : 'text-red-600'
                    )} />
                    <span className="text-sm font-medium text-gray-900">{project.name}</span>
                    {getStatusBadge(project.status)}
                    <Badge variant="outline" className={getPriorityColor(project.priority)}>
                      {project.priority}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Health Score</div>
                      <div className={cn("text-sm font-medium",
                        health.healthScore >= 75 ? 'text-green-600' :
                        health.healthScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                      )}>
                        {health.healthScore}%
                      </div>
                    </div>
                    <Link href={`/projects/${project.id}`}>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Progress</span>
                    <span>{project.completion}% Complete</span>
                  </div>
                  <Progress value={project.completion} className="h-3" />
                </div>

                {/* Project Details */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-gray-500 mb-1">Timeline</div>
                    <div className="font-medium">{formatDateRange(project.startDate, project.endDate)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Days Remaining</div>
                    <div className={cn("font-medium", 
                      daysRemaining < 7 ? 'text-red-600' : 
                      daysRemaining < 14 ? 'text-yellow-600' : 'text-green-600'
                    )}>
                      {daysRemaining} days
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Resources</div>
                    <div className="font-medium">{project.resourceCount} people</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Allocation</div>
                    <div className="font-medium">{project.allocatedHours}h</div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    {/* Milestones */}
                    {project.milestones && project.milestones.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Upcoming Milestones</h5>
                        <div className="space-y-2">
                          {project.milestones.slice(0, 3).map(milestone => (
                            <div key={milestone.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                {milestone.completed ? (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Clock className={cn("h-3 w-3", milestone.critical ? 'text-red-600' : 'text-gray-400')} />
                                )}
                                <span className={milestone.completed ? 'line-through text-gray-500' : ''}>
                                  {milestone.name}
                                </span>
                                {milestone.critical && !milestone.completed && (
                                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">
                                    Critical
                                  </Badge>
                                )}
                              </div>
                              <span className="text-gray-500">{format(parseISO(milestone.date), 'MMM dd')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Risks */}
                    {project.risks && project.risks.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Risk Factors</h5>
                        <div className="space-y-1">
                          {project.risks.slice(0, 2).map(risk => (
                            <div key={risk.id} className="flex items-center gap-2 text-xs">
                              <AlertTriangle className={cn("h-3 w-3",
                                risk.severity === 'high' ? 'text-red-600' :
                                risk.severity === 'medium' ? 'text-yellow-600' : 'text-gray-400'
                              )} />
                              <span>{risk.description}</span>
                              <Badge variant="outline" className={cn("text-xs",
                                risk.severity === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                                risk.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                'bg-gray-100 text-gray-800 border-gray-200'
                              )}>
                                {risk.severity}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Budget */}
                    {project.budget && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Budget Status</h5>
                        <div className="flex items-center justify-between text-xs">
                          <span>Spent: ${project.budget.spent.toLocaleString()} / ${project.budget.total.toLocaleString()}</span>
                          <span className={cn("font-medium",
                            project.budget.spent > project.budget.total ? 'text-red-600' :
                            project.budget.spent > project.budget.total * 0.9 ? 'text-yellow-600' : 'text-green-600'
                          )}>
                            {((project.budget.spent / project.budget.total) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredProjects.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No projects match the selected filters</p>
              <p className="text-xs">Try adjusting your filter criteria</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
