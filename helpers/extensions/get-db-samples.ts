import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import fs from "node:fs";
import path from "node:path";

export default function (pi: ExtensionAPI) {
  const url = "https://my.na-02.cloud.solarwinds.com/common/graphql";
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:151.0) Gecko/20100101 Firefox/151.0",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": process.env.SOLARWINDS_COOKIE || "",
    "x-csrf-token": process.env.SOLARWINDS_CSRF_TOKEN || "",
    "content-type": "application/json",
  };

  pi.registerTool({
    name: "get-db-samples",
    label: "Get DB Samples",
    description: "Fetches database query samples from the SolarWinds profiler via GraphQL and saves them to a JSON file.",
    parameters: Type.Object({
      queryId: Type.String({ description: "The ID of the query to fetch samples for" }),
      startTime: Type.Optional(Type.String({ description: "Start time in milliseconds (e.g. '1780685709025')" })),
      endTime: Type.Optional(Type.String({ description: "End time in milliseconds (e.g. '1780696840025')" })),
      limit: Type.Optional(Type.Number({ description: "Total number of samples to fetch", default: 1000 })),
    }),
    async execute(toolCallId, params) {
      const { queryId, startTime, endTime, limit = 1000 } = params;

      const query = `query getDatabaseQuerySamples($timeRange: TimeRangeInput!, $paging: PagingInput, $filter: FilterInput) {
  databaseQuerySamples(
    input: {timeRange: $timeRange, filter: $filter, paging: $paging}
  ) {
    totalSamplesCount
    samples {
      text
      database
      timestamp
      origin
      application
      latency
      __typename
    }
    pageInfo {
      hasNextPage
      endCursor
      __typename
    }
    __typename
  }
}`;

      let allSamples: any[] = [];
      let endCursor: string | null = null;
      let hasNextPage = true;

      try {
        while (hasNextPage && allSamples.length < limit) {
          const variables = {
            timeRange: {
              startTime: startTime || "1780685709025",
              endTime: endTime || "1780696840025",
            },
            filter: {
              propertyName: "queryId",
              operation: "EQ",
              propertyValue: queryId,
            },
            paging: {
              first: Math.min(1000, limit - allSamples.length),
              after: endCursor,
            },
          };

          const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({
              operationName: "getDatabaseQuerySamples",
              variables,
              query,
            }),
          });

          if (!response.ok) {
            return {
              content: [{ type: "text", text: `HTTP Error: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          const json = await response.json();
          
          if (json.errors) {
            return {
              content: [{ type: "text", text: `GraphQL Errors: ${JSON.stringify(json.errors)}` }],
              isError: true,
            };
          }

          const data = json.data?.databaseQuerySamples;
          if (!data) break;

          const samples = data.samples || [];
          allSamples.push(...samples);

          const pageInfo = data.pageInfo;
          hasNextPage = pageInfo?.hasNextPage ?? false;
          endCursor = pageInfo?.endCursor ?? null;
        }

        if (allSamples.length === 0) {
          return {
            content: [{ type: "text", text: "No samples found in the response." }],
          };
        }

        const dir = path.join(process.cwd(), "db_samples");
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const filename = `${queryId}.json`;
        const filePath = path.join(dir, filename);
        fs.writeFileSync(filePath, JSON.stringify(allSamples, null, 2));

        return {
          content: [{ type: "text", text: `Successfully fetched ${allSamples.length} samples and saved to db_samples/${filename}` }],
          details: { filePath },
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Fetch Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  });

  pi.registerTool({
    name: "get-query-ids",
    label: "Get Query IDs",
    description: "Returns a mapping of query names (and filters for .find) to their IDs and ranking percentages from SolarWinds profiler.",
    parameters: Type.Object({
      startTime: Type.String({ description: "Start time in milliseconds" }),
      endTime: Type.String({ description: "End time in milliseconds" }),
      metric: Type.Union([Type.Literal("count"), Type.Literal("time")], { description: "Metric to rank by: 'count' or 'time'" }),
    }),
    async execute(toolCallId, params) {
      const { startTime, endTime, metric } = params;

      const metricNameMap: Record<string, string> = {
        "time": "dbo.host.queries.time_us",
        "count": "dbo.host.queries.tput"
      };

      const metricName = metricNameMap[metric];

      const query = `query rankProfilerCategory($metricName: String!, $limit: Int!, $timeRange: TimeRangeInput!, $filter: FilterInput, $query: String, $includeInsights: Boolean! = false) {
  databaseProfiler {
    rank(
      input: {metricName: $metricName, limit: $limit, timeRange: $timeRange, filter: $filter, query: $query}
    ) {
      id
      rows {
        id
        ranking {
          position
          percentage
          value
          __typename
        }
        description
        insights(types: "DatabaseProfilerQuerySampleInsight") @include(if: $includeInsights) {
          ... on DatabaseProfilerQuerySampleInsight {
            hasErrors
            hasExplainPlans
            hasWarnings
            insightType
            __typename
          }
          __typename
        }
        __typename
      }
      rest {
        description
        rowCount
        ranking {
          value
          percentage
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
  __typename
}`;

      function extractFilter(args: string): string | null {
        const filterIdx = args.indexOf('filter:');
        if (filterIdx === -1) return null;

        let start = -1;
        for (let i = filterIdx + 7; i < args.length; i++) {
          if (args[i] === '{') {
            start = i;
            break;
          }
          if (args[i] === ',') return null;
        }

        if (start === -1) return null;

        let balance = 0;
        for (let i = start; i < args.length; i++) {
          if (args[i] === '{') balance++;
          else if (args[i] === '}') balance--;

          if (balance === 0) {
            return args.substring(start, i + 1);
          }
        }
        return null;
      }

      function getQueryName(description: string): string {
        const openParenIndex = description.indexOf('(');
        if (openParenIndex === -1) return description;

        const baseName = description.substring(0, openParenIndex);
        if (baseName.endsWith('.find')) {
          const args = description.substring(openParenIndex + 1);
          const filter = extractFilter(args);
          if (filter) {
            return `${baseName}(${filter})`;
          }
        }
        return baseName;
      }

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            operationName: "rankProfilerCategory",
            variables: {
              includeInsights: false,
              limit: 20,
              metricName,
              timeRange: { startTime, endTime },
              query: "entities(type:DatabaseQueryDigest AND NOT isInternal:true AND digest:~account_system)",
            },
            query,
          }),
        });

        if (!response.ok) {
          return {
            content: [{ type: "text", text: `HTTP Error: ${response.status} ${response.statusText}` }],
            isError: true,
          };
        }

        const json = await response.json();
        if (json.errors) {
          return {
            content: [{ type: "text", text: `GraphQL Errors: ${JSON.stringify(json.errors)}` }],
            isError: true,
          };
        }

        const rankData = json.data?.databaseProfiler?.rank;
        if (!rankData) {
          return { content: [{ type: "text", text: "No ranking data found in response." }] };
        }

        const queryMapping: Record<string, { id: string; percentage: number }> = {};
        for (const row of rankData.rows || []) {
          const name = getQueryName(row.description);
          queryMapping[name] = {
            id: row.id,
            percentage: row.ranking?.percentage ?? 0,
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(queryMapping, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Fetch Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  });
}
