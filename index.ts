import ky from "ky";
import Elysia from "elysia";
import z from "zod";

export default new Elysia().get(
  "/mojie",
  async ({
    query: { email, password, cvtHost, target, mojieHost, ruleTemplate },
  }) => {
    const dataurl = `https://${mojieHost}/api/?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    const { data: auth } = await ky.get(dataurl).json<{ data: string }>();
    const tipsurl = `https://${mojieHost}/api?action=gettipsbody`;
    const res = await ky
      .get(tipsurl, {
        headers: {
          cookie: `auth=${auth}`,
        },
      })
      .text();

    // 提取 ?token= 后面的 " 前面的内容
    const token = res.match(/\?token=(.*?)"/)?.[1];

    const suburl = encodeURIComponent(
      `https://${mojieHost}/api/v1/client/subscribe?token=${token}`,
    );

    const configurl = encodeURIComponent(ruleTemplate);

    const url = `https://${cvtHost}/sub?target=${target}&new_name=true&url=${suburl}&config=${configurl}&emoji=true&list=false&sort=true&udp=true&append_type=true&classic=true`;

    return await ky.get(url).text();
  },
  {
    query: z.object({
      email: z.string(),
      password: z.string(),
      cvtHost: z.string(),
      target: z.optional(z.string()).default("clash"),
      mojieHost: z.optional(z.string()).default("mojie.xn--yrs494l.com"),
      ruleTemplate: z
        .optional(z.string())
        .default(
          "https://testingcf.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/cfg/Custom_Clash_Full.ini",
        ),
    }),
  },
);
