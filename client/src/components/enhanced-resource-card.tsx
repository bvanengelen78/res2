import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProfileImageUpload } from './profile-image-upload';
import {
  Mail,
  Clock,
  Eye,
  Edit,
  Building,
  Users,
  Star,
  MapPin,
  Activity
} from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import type { Resource } from '@shared/schema';

interface EnhancedResourceCardProps {
  resource: Resource;
  onEdit: (resource: Resource) => void;
  variant?: 'grid' | 'list';
  showActions?: boolean;
  className?: string;
}

export function EnhancedResourceCard({ 
  resource, 
  onEdit, 
  variant = 'grid',
  showActions = true,
  className = ''
}: EnhancedResourceCardProps) {
  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-emerald-50/80 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
      : 'bg-gray-50/80 text-gray-600 border-gray-300 hover:bg-gray-100';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const getDepartmentColor = (department: string) => {
    switch (department) {
      case 'E-commerce':
      case 'E-commerce DACH':
      case 'E-commerce Benelux':
        return 'bg-blue-50/80 text-blue-700 border-blue-300 hover:bg-blue-100';
      case 'IT Architecture & Delivery':
        return 'bg-purple-50/80 text-purple-700 border-purple-300 hover:bg-purple-100';
      case 'Change':
        return 'bg-orange-50/80 text-orange-700 border-orange-300 hover:bg-orange-100';
      case 'Data & Analytics':
        return 'bg-emerald-50/80 text-emerald-700 border-emerald-300 hover:bg-emerald-100';
      case 'Marketing':
        return 'bg-pink-50/80 text-pink-700 border-pink-300 hover:bg-pink-100';
      case 'Formule & Brand':
        return 'bg-indigo-50/80 text-indigo-700 border-indigo-300 hover:bg-indigo-100';
      case 'Commercie BLX':
      case 'Commercie DACH':
        return 'bg-cyan-50/80 text-cyan-700 border-cyan-300 hover:bg-cyan-100';
      default:
        return 'bg-gray-50/80 text-gray-700 border-gray-300 hover:bg-gray-100';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Change Lead':
        return 'bg-red-50/80 text-red-700 border-red-300 hover:bg-red-100';
      case 'Manager Change':
        return 'bg-amber-50/80 text-amber-700 border-amber-300 hover:bg-amber-100';
      case 'Business Controller':
        return 'bg-teal-50/80 text-teal-700 border-teal-300 hover:bg-teal-100';
      default:
        return 'bg-gray-50/80 text-gray-700 border-gray-300 hover:bg-gray-100';
    }
  };

  if (variant === 'list') {
    return (
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-300 ease-out cursor-pointer",
        "hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5",
        "border-0 bg-white/90 backdrop-blur-sm shadow-md",
        "hover:bg-white",
        className
      )}>
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <div className="relative">
                <ProfileImageUpload
                  resource={resource}
                  size="md"
                  editable={false}
                />
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                  resource.isActive ? "bg-green-500" : "bg-gray-400"
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                    {resource.name}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-medium text-xs px-2.5 py-1 border-2",
                      getStatusColor(resource.isActive)
                    )}
                  >
                    {getStatusText(resource.isActive)}
                  </Badge>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                  <div className="flex items-center space-x-1">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{resource.email}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Building className="h-4 w-4 text-gray-400" />
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-2 font-medium text-xs",
                        getDepartmentColor(resource.department)
                      )}
                    >
                      {resource.department}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{resource.weeklyCapacity}h/week</span>
                  </div>
                </div>

                {resource.roles && resource.roles.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {resource.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="outline"
                          className={cn(
                            "text-xs border-2 font-medium whitespace-nowrap max-w-full truncate",
                            getRoleColor(role)
                          )}
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {showActions && (
              <div className="flex items-center space-x-2 ml-4">
                <Link href={`/resources/${resource.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(resource)}
                  className="px-3 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-300 ease-out cursor-pointer",
        "hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.02]",
        "border-0 bg-white/90 backdrop-blur-sm shadow-md",
        "hover:bg-white",
        className
      )}>
        <CardHeader className="pb-4 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="relative">
                <ProfileImageUpload
                  resource={resource}
                  size="md"
                  editable={true}
                />
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                  resource.isActive ? "bg-green-500" : "bg-gray-400"
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Tooltip>
                    <TooltipTrigger>
                      <CardTitle className="text-lg font-semibold group-hover:text-blue-600 transition-colors leading-tight truncate">
                        {resource.name}
                      </CardTitle>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{resource.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Activity className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate whitespace-nowrap max-w-[150px]" title={resource.role}>{resource.role}</span>
                </div>
              </div>
            </div>

            <Badge
              variant="outline"
              className={cn(
                "font-medium text-xs px-2.5 py-1 border-2",
                getStatusColor(resource.isActive)
              )}
            >
              {getStatusText(resource.isActive)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 relative z-10">
          {/* Contact Information */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <Tooltip>
              <TooltipTrigger>
                <span className="truncate hover:text-gray-800 transition-colors">{resource.email}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{resource.email}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Department */}
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-2 font-medium transition-all duration-200 hover:scale-105",
                    getDepartmentColor(resource.department)
                  )}
                >
                  {resource.department.length > 20 ?
                    `${resource.department.substring(0, 20)}...` :
                    resource.department
                  }
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{resource.department}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Weekly Capacity */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900">{resource.weeklyCapacity}h</span>
              <span className="text-gray-500">/week capacity</span>
            </div>
          </div>

          {/* Special Roles */}
          {resource.roles && resource.roles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">Special Roles</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {resource.roles.map((role) => (
                  <Tooltip key={role}>
                    <TooltipTrigger>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs border-2 font-medium transition-all duration-200 hover:scale-105",
                          getRoleColor(role)
                        )}
                      >
                        {role.length > 15 ? `${role.substring(0, 15)}...` : role}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{role}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
          
          {/* Skills */}
          {resource.skills && resource.skills.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">Skills</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {resource.skills.slice(0, 3).map((skill, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs bg-gray-50/80 text-gray-700 border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    {skill}
                  </Badge>
                ))}
                {resource.skills.length > 3 && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge
                        variant="outline"
                        className="text-xs bg-blue-50/80 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors cursor-help"
                      >
                        +{resource.skills.length - 3} more
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        {resource.skills.slice(3).map((skill, index) => (
                          <p key={index} className="text-sm">{skill}</p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {showActions && (
          <CardContent className="pt-0 relative z-10">
            <div className="flex space-x-2 pt-4 border-t border-gray-100/80">
              <Link href={`/resources/${resource.id}`} className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200 font-medium"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(resource)}
                className="px-3 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </TooltipProvider>
  );
}