package com.zuantou.filter;

import com.alibaba.fastjson.JSONObject;
import com.zuantou.pojo.Result;
import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;


@WebFilter(urlPatterns = "/*")
public class JwtFilter implements Filter {
    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        String url = request.getRequestURI();
        if (url.contains("/creatInviteCode") || url.contains("/login") || url.contains("/register")){
            return;
        }

        String jwt = request.getHeader("token");
        if (jwt.isEmpty()){
            String notLogin = JSONObject.toJSONString(Result.error("NOT_LOGIN"));
            response.getWriter().write(notLogin);
        }

        filterChain.doFilter(servletRequest, servletResponse);
    }

}
