package com.zuantou.common.filter;

import com.alibaba.fastjson.JSONObject;
import com.zuantou.common.properties.ErrorCode;
import com.zuantou.common.utils.JwtUtils;
import com.zuantou.common.utils.UserContext;
import com.zuantou.pojo.Result;
import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;


@WebFilter(urlPatterns = "/*")
public class JwtFilter implements Filter {
    final JwtUtils jwtUtils;

    public JwtFilter(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
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
            String notLogin = JSONObject.toJSONString(Result.error(ErrorCode.NOT_LOGIN));
            response.getWriter().write(notLogin);
        }

        try {
            UserContext.setUserId(Integer.valueOf(jwtUtils.parseJWT(jwt).get("user_id").toString()));
        } catch (Exception e){
            String notLogin = JSONObject.toJSONString(Result.error(ErrorCode.NOT_LOGIN));
            response.getWriter().write(notLogin);
            return;
        }

        filterChain.doFilter(servletRequest, servletResponse);

        UserContext.clear();
    }

}
