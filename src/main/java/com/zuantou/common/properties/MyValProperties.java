package com.zuantou.common.properties;


import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "my.val")
public class MyValProperties {
    private String signKey;
    private Long expire;
    private String url;
}
