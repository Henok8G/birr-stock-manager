import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { TopSellerData } from '@/types/inventory';

interface TopSellersChartProps {
  data: TopSellerData[];
}

export function TopSellersChart({ data }: TopSellersChartProps) {
  const formatName = (name: string) => {
    if (name.length > 10) {
      return name.substring(0, 10) + '..';
    }
    return name;
  };

  const colors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <h3 className="font-semibold text-lg text-foreground mb-4">Product Sales (Last 7 Days)</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: 10, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis
              dataKey="product_name"
              tickFormatter={formatName}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              angle={-45}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
            <Tooltip
              formatter={(value: number) => [`${value} units`, 'Units Sold']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Bar dataKey="units_sold" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
