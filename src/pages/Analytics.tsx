import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Package, AlertTriangle, CheckCircle } from 'lucide-react';

const distributionData = [
  { month: 'Jan', doses: 45000, compliance: 98 },
  { month: 'Feb', doses: 52000, compliance: 97 },
  { month: 'Mar', doses: 48000, compliance: 99 },
  { month: 'Apr', doses: 61000, compliance: 96 },
  { month: 'May', doses: 55000, compliance: 98 },
  { month: 'Jun', doses: 67000, compliance: 99 },
];

const vaccineTypeData = [
  { name: 'Pfizer-BioNTech', value: 45, color: 'hsl(var(--primary))' },
  { name: 'Moderna', value: 30, color: 'hsl(var(--secondary))' },
  { name: 'Johnson & Johnson', value: 15, color: 'hsl(var(--accent))' },
  { name: 'AstraZeneca', value: 10, color: 'hsl(var(--muted))' },
];

const temperatureComplianceData = [
  { week: 'Week 1', compliant: 98, breach: 2 },
  { week: 'Week 2', compliant: 97, breach: 3 },
  { week: 'Week 3', compliant: 99, breach: 1 },
  { week: 'Week 4', compliant: 96, breach: 4 },
];

const stats = [
  {
    title: 'Total Doses Distributed',
    value: '328,000',
    change: '+12.5%',
    trend: 'up',
    icon: Package,
  },
  {
    title: 'Temperature Compliance',
    value: '98.2%',
    change: '+0.8%',
    trend: 'up',
    icon: CheckCircle,
  },
  {
    title: 'Active Shipments',
    value: '24',
    change: '-3',
    trend: 'down',
    icon: Activity,
  },
  {
    title: 'Cold Chain Breaches',
    value: '10',
    change: '-5',
    trend: 'down',
    icon: AlertTriangle,
  },
];

export default function Analytics() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.split('/')[1] || 'dashboard';

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={(tab) => navigate(`/${tab}`)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
              <p className="text-muted-foreground">
                Comprehensive insights into vaccine distribution and cold chain performance
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <Card key={stat.title}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <stat.icon className="h-5 w-5 text-muted-foreground" />
                      <div className={`flex items-center gap-1 text-sm ${
                        stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span>{stat.change}</span>
                      </div>
                    </div>
                    <p className="text-2xl font-bold mb-1">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Tabs defaultValue="distribution" className="space-y-4">
              <TabsList>
                <TabsTrigger value="distribution">Distribution</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
                <TabsTrigger value="vaccines">Vaccine Types</TabsTrigger>
              </TabsList>

              <TabsContent value="distribution" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Distribution & Compliance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={distributionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="doses"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          name="Doses Distributed"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="compliance"
                          stroke="hsl(var(--secondary))"
                          strokeWidth={2}
                          name="Compliance %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Temperature Compliance Tracking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={temperatureComplianceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="compliant" fill="hsl(var(--primary))" name="Compliant %" />
                        <Bar dataKey="breach" fill="hsl(var(--destructive))" name="Breach %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vaccines" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Vaccine Distribution by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={vaccineTypeData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}%`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {vaccineTypeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Vaccine Type Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {vaccineTypeData.map((vaccine) => (
                        <div key={vaccine.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{vaccine.name}</span>
                            <span className="text-sm font-bold">{vaccine.value}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full transition-all"
                              style={{
                                width: `${vaccine.value}%`,
                                backgroundColor: vaccine.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
