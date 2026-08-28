package com.zuantou.config;


import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "mein.val")
public class MeinValProperties {
    private String signKey;
    private Long expire;
    private String url;
}
