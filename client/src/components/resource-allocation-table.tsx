import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Resource } from "@shared/schema";
import { Link } from "wouter";

interface ResourceAllocationTableProps {
  resources: Resource[];
  onAddResource: () => void;
}

export function ResourceAllocationTable({ resources, onAddResource }: ResourceAllocationTableProps) {
  const { data: heatmapData } = useQuery({
    queryKey: ["/api/dashboard/heatmap"],
  });

  const getAllocationData = (resourceId: number) => {
    const heatmapResource = heatmapData?.find((r: any) => r.id === resourceId);
    if (heatmapResource) {
      return {
        project: heatmapResource.projects > 0 ? `${heatmapResource.projects} project${heatmapResource.projects > 1 ? 's' : ''}` : 'Unassigned',
        allocation: `${heatmapResource.allocatedHours}h / ${heatmapResource.capacity}h`,
        utilization: heatmapResource.utilization,
        status: heatmapResource.status
      };
    }
    return { 
      project: 'Unassigned', 
      allocation: '0h / 0h', 
      utilization: 0, 
      status: 'available' 
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overallocated':
        return <Badge variant="destructive" className="whitespace-nowrap">Overallocated</Badge>;
      case 'near-capacity':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 whitespace-nowrap">Near Capacity</Badge>;
      case 'available':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 whitespace-nowrap">Available</Badge>;
      default:
        return <Badge variant="outline" className="whitespace-nowrap">{status}</Badge>;
    }
  };



  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Resource Allocation Overview
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              Export
            </Button>
            <Button onClick={onAddResource} size="sm">
              Add Resource
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allocation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {resources.map((resource) => {
                const allocation = getAllocationData(resource.id);
                
                return (
                  <tr key={resource.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {resource.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-4">
                          <Link href={`/resources/${resource.id}`}>
                            <div className="text-sm font-medium text-gray-900 hover:text-blue-600 cursor-pointer">{resource.name}</div>
                          </Link>
                          <div className="text-sm text-gray-500">{resource.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="max-w-32 truncate" title={resource.role}>
                        {resource.role}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {allocation.project}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {allocation.allocation}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{allocation.allocation}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(allocation.status)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
