package com.zuantou.pojo.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CheckUserNameVO {
    @JsonProperty("is_available")
    private boolean available;
}
