package com.zuantou.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "mein.val.file")
public class MeinValFileProperties {
    private String path;
    private String publicPath;
}
