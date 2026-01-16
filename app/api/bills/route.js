import * as cheerio from "cheerio";

export async function GET(request) {
  const baseUrl = "https://prsindia.org";
  const url = `${baseUrl}/billtrack/`;
  
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const skip = (page - 1) * limit;

  try {
    const response = await fetch(url, { cache: "no-store" });
    const body = await response.text();
    const $ = cheerio.load(body);

    let allBills = [];

    $(".view-content .views-row").each((i, el) => {
      const billTitle = $(el).find("a").first().text().trim();
      const detailLink = $(el).find("a").first().attr("href");

      if (billTitle && detailLink) {
        allBills.push({
          id: i + 1,
          title: billTitle,
          link: baseUrl + detailLink,
          pdf: null,
        });
      }
    });

    const paginatedBills = allBills.slice(skip, skip + limit);

    for (let bill of paginatedBills) {
      try {
        const res = await fetch(bill.link);
        const html = await res.text();
        const $$ = cheerio.load(html);

        const pdfLink = $$("a[href$='.pdf']").attr("href");
        if (pdfLink) {
          if (pdfLink.startsWith("http")) {
            bill.pdf = pdfLink;
          } else if (pdfLink.startsWith("/")) {
            bill.pdf = baseUrl + pdfLink;
          } else {
            bill.pdf = baseUrl + "/" + pdfLink;
          }
          console.log(`PDF URL for bill ${bill.id}: ${bill.pdf}`);
        }
      } catch (err) {
        console.error(`Error fetching ${bill.link}:`, err);
      }
    }

    const totalBills = allBills.length;
    const hasMore = skip + limit < totalBills;

    console.log(`Page ${page}: ${paginatedBills.length} bills, hasMore: ${hasMore}`);

    return new Response(JSON.stringify({
      bills: paginatedBills,
      pagination: {
        page,
        limit,
        total: totalBills,
        hasMore,
        totalPages: Math.ceil(totalBills / limit)
      }
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error scraping bills:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to fetch bills",
      bills: [],
      pagination: {
        page,
        limit,
        total: 0,
        hasMore: false,
        totalPages: 0
      }
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
