import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { CalendarDiamondIcon } from "@/components/icons/calendar-diamond-icon";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
      <Card className="w-full max-w-md mx-4 shadow-xl border border-slate-200/60 bg-white rounded-2xl">
        <CardContent className="pt-8 pb-6 px-8 text-center">
          <div className="space-y-4">
            <div className="flex justify-center">
              <CalendarDiamondIcon className="text-slate-700" size={48} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
              </div>
              <p className="text-sm text-gray-600">
                The page you're looking for doesn't exist in ResourceFlow.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
