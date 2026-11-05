export type PlatformCount = { platform: string; visits: number };
export type PageCount = { page_path: string; visits: number };
export type RecentEvent = {
  id: string;
  timestamp: string;
  page_path: string;
  page_url: string;
  bot_name: string;
  platform: string;
  bot_type: string;
  user_agent: string;
};

export type SiteActivity = {
  start: string;
  end: string;
  total: number;
  overview: {
    active_bots: number;
    top_platform: string | null;
    top_page: string | null;
  };
  timeline: { bucket_start: string; visits: number }[];
  platforms: PlatformCount[];
  top_pages: PageCount[];
  recent_events: RecentEvent[];
  available_platforms: string[];
};
