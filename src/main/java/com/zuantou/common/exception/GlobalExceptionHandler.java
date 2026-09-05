package com.zuantou.common.exception;

import com.zuantou.pojo.vo.Result;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(BusinessException.class)
    public Result<Void> handle(BusinessException e) {
        return Result.error(e.getCode());
    }
}