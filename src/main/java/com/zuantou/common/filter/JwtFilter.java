package com.zuantou.common.filter;

import com.alibaba.fastjson.JSONObject;
import com.zuantou.common.jwt.JwtBlacklistMap;
import com.zuantou.common.properties.ErrorCode;
import com.zuantou.common.jwt.JwtUtils;
import com.zuantou.common.utils.UserContext;
import com.zuantou.pojo.JwtBlacklist;
import com.zuantou.pojo.vo.Result;
import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;


@WebFilter(urlPatterns = "/*")
public class JwtFilter implements Filter {
    final JwtUtils jwtUtils;
    final JwtBlacklistMap jwtBlacklistMap;

    public JwtFilter(JwtUtils jwtUtils, JwtBlacklistMap jwtBlacklistMap) {
        this.jwtUtils = jwtUtils;
        this.jwtBlacklistMap = jwtBlacklistMap;
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        String url = request.getRequestURI();
        if (url.contains("/checkUserName") || url.contains("/login") || url.contains("/register") || url.contains("swagger-ui") || url.contains("/v3/api-docs")){
            filterChain.doFilter(servletRequest, servletResponse);
            return;
        }

        String jwt = request.getHeader("token");
        if (jwt == null || jwt.isEmpty()){
            response.getWriter().write(JSONObject.toJSONString(Result.error(ErrorCode.NOT_LOGIN)));
            return;
        }
        for (JwtBlacklist jwtBlacklist : jwtBlacklistMap.blacklists) {
            if (jwtUtils.sha256(jwt).equals(jwtBlacklist.getJwt())){
                response.getWriter().write(JSONObject.toJSONString(Result.error(ErrorCode.BLACKLISTED_JWT)));
                return;
            }
        }
        try {
            UserContext.setUserId(Integer.valueOf(jwtUtils.parseJWT(jwt).get("user_id").toString()));
            UserContext.setBlacklistedJwt(jwtUtils.sha256(jwt));
        } catch (Exception e){
            response.getWriter().write(JSONObject.toJSONString(Result.error(ErrorCode.NOT_LOGIN)));
            return;
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            UserContext.clear();
        }
    }

}
