import axios from "axios";

export async function fetchJSearchJobs() {
  try {
    const response = await axios.get("https://jsearch.p.rapidapi.com/search", {
      params: {
        query: "Full Stack Developer OR Software Engineer jobs in India",
        date_posted: "today",
        num_pages: "3",
      },
      headers: {
        "X-RapidAPI-Key": process.env.JSEARCH_API_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
    });

    const jobs = response.data.data;
    console.log(`JSearch returned ${jobs?.length ?? 0} jobs`);

    if (!jobs || jobs.length === 0) return [];

    return jobs.map((job: any) => ({
      id: job.job_id,
      title: job.job_title,
      company: job.employer_name,
      location: `${job.job_city ?? ""} ${job.job_country ?? ""}`.trim(),
      salary: job.job_min_salary
        ? `${job.job_min_salary} - ${job.job_max_salary}`
        : "Not specified",
      applyLink: job.job_apply_link,
      source: job.job_publisher,
      description: job.job_description ?? "", // ← full description, slice mat kar — Gemini ko poora context chahiye
    }));
  } catch (error: any) {
    console.error("JSearch error:", error?.response?.data || error?.message);
    return [];
  }
}
