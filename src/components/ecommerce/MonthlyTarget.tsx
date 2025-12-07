import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";
import { useModal } from "@/hooks/useModal";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { api } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";

export default function MonthlyTarget({
  revenue,
  target,
  today,
}: {
  revenue: number;
  target: number;
  today: number;
}) {
  const series = [target !== 0 ? Math.min((revenue * 100) / target, 100) : 0];
  const options: ApexOptions = {
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 200,
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: {
          size: "70%",
        },
        track: {
          background: "#E4E7EC",
          strokeWidth: "100%",
          margin: 4,
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            fontSize: "24px",
            fontWeight: "600",
            offsetY: -20,
            color: "#1D2939",
            formatter: function (val) {
              return Math.round(val) + "%";
            },
          },
        },
      },
    },
    fill: {
      type: "solid",
      colors: ["#465FFF"],
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Progress"],
  };
  const [isOpen, setIsOpen] = useState(false);
  const [targetValue, setTargetValue] = useState<string>(target > 0 ? target.toString() : "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentShop } = useUser();
  const isOwner = currentShop?.role === "owner";

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }
  const { openModal, isOpen: open, closeModal } = useModal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOwner) {
      toast.error("Only shop owners can set monthly targets");
      return;
    }

    const numericTarget = parseFloat(targetValue);

    if (isNaN(numericTarget) || numericTarget <= 0) {
      toast.error("Please enter a valid target amount");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.shops.update({ target: numericTarget });
      toast.success("Monthly target updated successfully!");
      closeModal();
      // Reload the page to reflect the new target
      window.location.reload();
    } catch (error) {
      console.error("Failed to update target:", error);
      toast.error("Failed to update monthly target. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-3 pt-3 bg-white shadow-default rounded-xl pb-2 dark:bg-gray-900 sm:px-4 sm:pt-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white/90">
              Monthly Target
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Target you've set for each month
            </p>
          </div>
          <div className="relative inline-block" hidden={target == 0}>
            <button className="dropdown-toggle" onClick={toggleDropdown}>
              <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-5" />
            </button>
            <Dropdown
              isOpen={isOpen}
              onClose={closeDropdown}
              className="w-36 p-1.5"
            >
              <DropdownItem
                onItemClick={() => {
                  openModal();
                  closeDropdown();
                }}
                className="flex w-full text-sm font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                Change Target
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
        <div className="relative">
          <div className="max-h-[200px] -mb-8" id="chartDarkStyle">
            <Chart
              options={options}
              series={series}
              type="radialBar"
              height={200}
            />
          </div>
        </div>
        <p className="mx-auto w-full text-center text-xs sm:text-sm text-gray-500 mt-2">
          {target !== 0 ? (
            `You earn ${formatCurrency(today)} today`
          ) : (
            <Button
              className="primary bg-blue-700 text-white text-sm hover:bg-blue-800"
              size={"sm"}
              onClick={openModal}
            >
              Set Target
            </Button>
          )}
        </p>
      </div>

      <div className="flex items-center justify-center gap-4 px-3 py-2.5 sm:gap-6 sm:py-3">
        <div className="text-center">
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
            Target
          </p>
          <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white/90">
            {formatCurrency(target)}
          </p>
        </div>

        <div className="w-px bg-gray-200 h-6 dark:bg-gray-800"></div>

        <div className="text-center">
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
            Revenue
          </p>
          <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white/90">
            {formatCurrency(revenue)}
          </p>
        </div>

        <div className="w-px bg-gray-200 h-6 dark:bg-gray-800"></div>

        <div className="text-center">
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
            Today
          </p>
          <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white/90">
            {formatCurrency(today)}
          </p>
        </div>
      </div>
      <Modal
        isOpen={open}
        onClose={closeModal}
        className="max-w-[500px] p-6 lg:p-8 max-h-[80%] overflow-y-auto"
      >
        <div className="flex flex-col">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
            {target > 0 ? "Update Monthly Target" : "Set Monthly Target"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {isOwner
              ? "Set a monthly revenue target for your shop to track performance."
              : "Only shop owners can set monthly targets."}
          </p>

          {!isOwner ? (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                You don't have permission to set monthly targets. Please contact the shop owner.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label
                  htmlFor="target"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Monthly Target Amount (₦)
                </label>
                <input
                  type="number"
                  id="target"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="e.g., 1000000"
                  min="1"
                  step="0.01"
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  This target will be used to calculate your monthly performance metrics.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : target > 0 ? "Update Target" : "Set Target"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
