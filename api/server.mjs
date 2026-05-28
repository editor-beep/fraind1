import { NodeRequest, sendNodeResponse } from "srvx/node";
import serverHandler from "../dist/server/server.js";

export default async function handler(req, res) {
  const webReq = new NodeRequest({ req, res });
  const webRes = await serverHandler.fetch(webReq);
  if (webRes.headers.get("content-type")?.startsWith("text/html")) {
    res.setHeader("content-encoding", "identity");
  }
  await sendNodeResponse(res, webRes);
}
