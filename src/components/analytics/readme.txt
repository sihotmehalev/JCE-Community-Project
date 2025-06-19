analytics/ folder specs:

- Contains all analytics-related React components for the project.
- unifiedAnalyticsBarChart.jsx: Main component that renders all analytics bar charts in a unified way.
- Each chart was previously implemented in a separate file, but now all are combined in unifiedAnalyticsBarChart.jsx for maintainability and consistency.
- Components from this folder are used in the analyticsTab section of the application, typically within a DropdownSection.
- Additional helper files (e.g., chart utilities, data formatters) may be added here as needed.
- All components should be documented and follow project coding standards.


Initially, each chart was implemented in its own separate file. Each of these chart components was then individually added to the analiticsTav component, typically under a DropdownSection to organize them in the UI.
To improve maintainability and reduce code duplication, all chart implementations have now been unified into a single file called unifiedAnalyticsBarChart. This new component handles the rendering of all charts, making the codebase cleaner and easier to manage.

Benefits of this change:

Easier to update or add new charts in one place.
Reduces repeated code and simplifies imports.
Makes the analytics section more scalable and maintainable.

import { AdminAnalyticsTab } from '../analytics/AnalyticsTab';

<Button
          variant={activeTab === "analytics" ? "default" : "outline"}
          onClick={() => setActiveTab("analytics")}
          className="py-3 px-6 text-lg"
        >
          סטטיסטיקה
        </Button>

{/*analytics tab*/}
      {activeTab === "analytics" && (
        <Card>
          <CardContent>
            <AdminAnalyticsTab />
          </CardContent>
        </Card>
      )}