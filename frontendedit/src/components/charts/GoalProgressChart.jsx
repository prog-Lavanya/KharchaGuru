import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const GoalProgressChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart layout="vertical" data={data}>
        <XAxis type="number" domain={[0, 100]} />
        <YAxis type="category" dataKey="name" />
        <Tooltip />
        <Bar dataKey="progress" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default GoalProgressChart;