import ky from "ky";
import { Elysia } from "elysia";
import z from "zod";

export default new Elysia()
  .get(
    "/mojie",
    async ({
      query: { email, password, cvtHost, target, mojieHost, ruleTemplate, nfsqHost },
    }) => {
      const eemail = encodeURIComponent(email);
      const epassword = encodeURIComponent(password);

      // 解析魔戒 token
      const dataurl = `https://${mojieHost}/api/?action=login&email=${eemail}&password=${epassword}`;
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
      const mojieSubURL = `https://${mojieHost}/api/v1/client/subscribe?token=${token}`;

      // 解析 nfsq
      const resn = await ky.get(`https://${nfsqHost}`)
      const b = await resn.text();
      const matches = b.match(/src="(\/slide_check_.*?\.js)">/);
      const slidePath = matches ? matches[1] : null;
      const slideRes = await ky.get(`https://${nfsqHost}${slidePath}`)
      const slideText = await slideRes.text();
      const tokenMatch = slideText.match(/set_access_token-[^"']+/)!;
      const nfsqSubRes = await ky.get(`https://${nfsqHost}/${tokenMatch[0]}`)
      const cookie = nfsqSubRes.headers.get("set-cookie")!.split(";")[0]
      const nfsqRes = await ky.post(`https://${nfsqHost}/api/v1/passport/auth/login`, {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          cookie: cookie,
        },
        body: `email=${eemail}&password=${epassword}`
      }).json<{ data: { auth_data: string } }>();
      const a = await ky.get(`https://${nfsqHost}/api/v1/user/getSubscribe`, {
        headers: {
          "cookie": cookie,
          authorization: nfsqRes.data.auth_data,
        }
      }).json<{ data: { subscribe_url: string } }>()
      const subURL = a.data.subscribe_url

      const suburl = encodeURIComponent(
        [mojieSubURL, subURL].join("|"),
      );

      const configurl = encodeURIComponent(ruleTemplate);
      const url = `https://${cvtHost}/sub?target=${target}&new_name=true&url=${suburl}&config=${configurl}&emoji=true&list=false&sort=true&udp=true&append_type=true&classic=true`;

      return await ky.get(url, {
        timeout: 30000,
      }).text();
    },
    {
      query: z.object({
        email: z.string(),
        password: z.string(),
        cvtHost: z.string().default("tetvzxfbrkpk.ap-northeast-1.clawcloudrun.com"),
        target: z.optional(z.string()).default("clash"),
        mojieHost: z.optional(z.string()).default("mojie.xn--yrs494l.com"),
        nfsqHost: z.optional(z.string()).default("www.nfsqttt.com"),
        ruleTemplate: z
          .optional(z.string())
          .default(
            "https://testingcf.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/cfg/Custom_Clash_Full.ini",
          ),
      }),
    },
  );
