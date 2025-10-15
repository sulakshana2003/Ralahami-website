/* eslint-disable @typescript-eslint/no-explicit-any */
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

// Register the necessary Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type BarChartProps = {
  data: { labels: string[]; values: number[]; units: string[] }; // Include units in the data
};

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  // Prepare the chart data structure
  const chartData = {
    labels: data.labels.map((label, index) => `${label} (${data.units[index]})`), // Combine name with unit
    datasets: [
      {
        label: "Stock Level",
        data: data.values, // Stock quantities
        backgroundColor: "rgba(75, 192, 192, 0.2)", // Bar color
        borderColor: "rgba(75, 192, 192, 1)", // Border color
        borderWidth: 1,
      },
    ],
  };

  // Bar chart options
  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Inventory Stock Levels",
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `${context.dataset.label}: ${context.raw}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true, // Ensure that the Y-axis starts from 0
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default BarChart;
