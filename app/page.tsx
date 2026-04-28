import ClientApp from "./_components/ClientApp";

// Server-rendered: the table number is parsed on the server so the initial
// HTML already contains the logo + correct table label. React hydration only
// attaches event handlers — first contentful paint is essentially the time
// it takes to download the HTML.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const params = await searchParams;
  const tableNum = Number(params.t);
  const validTable =
    Number.isInteger(tableNum) && tableNum >= 1 && tableNum <= 99;
  return <ClientApp tableNum={validTable ? tableNum : null} />;
}
