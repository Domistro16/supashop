import { bu } from "node_modules/@fullcalendar/core/internal-common";
import { Button } from "../ui/button";

interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string; // Additional custom classes for styling
  desc?: string; // Description text
  buttons?: React.ReactNode; // Optional buttons or actions
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
  buttons,
}) => {
  return (
    <div
      className={`rounded-xl sm:rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {/* Card Header */}
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="px-3 py-3 sm:px-5 sm:py-4">
          <h3 className="text-sm sm:text-base font-medium text-gray-800 dark:text-white/90">
            {title}
          </h3>
          {desc && (
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {desc}
            </p>
          )}
        </div>
        {buttons}
      </div>

      {/* Card Body */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 sm:p-5">
        <div className="space-y-4 sm:space-y-5">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
