// app/api/bills/route.js
import * as cheerio from "cheerio";

export async function GET() {
  const baseUrl = "https://prsindia.org";
  const url = `${baseUrl}/billtrack/`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    const body = await response.text();
    const $ = cheerio.load(body);

    let bills = [];

    // Step 1: Get bill titles + detail page links
    $(".view-content .views-row").each((i, el) => {
      const billTitle = $(el).find("a").first().text().trim();
      const detailLink = $(el).find("a").first().attr("href");

      if (billTitle && detailLink) {
        bills.push({
          title: billTitle,
          link: baseUrl + detailLink,
          pdf: null, // will fill later
        });
      }
    });

    // Step 2: Visit each detail page and grab the PDF link
    for (let bill of bills) {
      try {
        const res = await fetch(bill.link, { cache: "no-store" });
        const html = await res.text();
        const $$ = cheerio.load(html);

        const pdfLink = $$("a[href$='.pdf']").attr("href");
        if (pdfLink) {
          bill.pdf = pdfLink.startsWith("http") ? pdfLink : baseUrl + pdfLink;
        }
      } catch (err) {
        console.error(`Error fetching ${bill.link}:`, err);
      }
    }

    return Response.json(bills);
  } catch (error) {
    console.error("Error scraping PRS:", error);
    return Response.json({ error: "Failed to fetch bills" }, { status: 500 });
  }
}
